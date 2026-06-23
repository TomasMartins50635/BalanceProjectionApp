using BalanceProjectionApp.Application.Features.Colaboradores.Dtos;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Colaboradores.Queries.ObterEstatisticasColaborador;

public class ObterEstatisticasColaboradorQueryHandler(IColaboradorRepository repository)
    : IRequestHandler<ObterEstatisticasColaboradorQuery, ColaboradorEstatisticasDto?>
{
    public async Task<ColaboradorEstatisticasDto?> Handle(
        ObterEstatisticasColaboradorQuery request,
        CancellationToken cancellationToken)
    {
        var colaborador = await repository.ObterPorIdAsync(request.ColaboradorId, cancellationToken);
        if (colaborador == null) return null;

        var comissoes = await repository.ListarComissoesAsync(request.ColaboradorId, cancellationToken);

        var receitaDetalhes = comissoes
            .Where(c => !c.IsDeleted && !c.Receita.IsDeleted)
            .Select(c =>
            {
                var parcelas = c.Receita.Parcelas
                    .Where(p => !p.IsDeleted)
                    .Select(p =>
                    {
                        var valorComissao = Math.Round(p.ValorBruto * c.Percentagem / 100, 2);
                        var dataPag = p.DataPagamento.HasValue
                            ? DateOnly.FromDateTime(p.DataPagamento.Value)
                            : (DateOnly?)null;
                        return new ParcelaParticipacaoDto(
                            p.Id, p.Numero, p.DataVencimento, dataPag,
                            p.ValorBruto, valorComissao, p.IsPaid);
                    })
                    .OrderBy(p => p.DataVencimento)
                    .ToList();

                var recebidoPeriodo = parcelas
                    .Where(p => p.IsPaid
                        && p.DataPagamento >= request.DataInicio
                        && p.DataPagamento <= request.DataFim)
                    .Sum(p => p.ValorComissao);

                var pendente = parcelas
                    .Where(p => !p.IsPaid)
                    .Sum(p => p.ValorComissao);

                return new ReceitaParticipacaoDto(
                    c.ReceitaId,
                    c.Receita.Nome,
                    c.Receita.Categoria?.ToString(),
                    c.TipoComissao.ToString(),
                    c.Percentagem,
                    recebidoPeriodo,
                    pendente,
                    parcelas);
            })
            .ToList();

        var allParcelas = receitaDetalhes.SelectMany(r => r.Parcelas).ToList();

        var porTipo = receitaDetalhes
            .GroupBy(r => r.TipoComissao)
            .Select(g =>
            {
                var gParcelas = g.SelectMany(r => r.Parcelas).ToList();
                return new EstatisticasTipoComissaoDto(
                    g.Key,
                    g.Sum(r => r.RecebidoPeriodo),
                    g.Sum(r => r.Pendente),
                    gParcelas.Count(p => p.IsPaid
                        && p.DataPagamento >= request.DataInicio
                        && p.DataPagamento <= request.DataFim),
                    gParcelas.Count(p => !p.IsPaid));
            })
            .ToList();

        return new ColaboradorEstatisticasDto(
            colaborador.Id,
            colaborador.Nome,
            colaborador.Tipo,
            request.DataInicio,
            request.DataFim,
            receitaDetalhes.Sum(r => r.RecebidoPeriodo),
            receitaDetalhes.Sum(r => r.Pendente),
            allParcelas.Where(p => p.IsPaid).Sum(p => p.ValorComissao),
            receitaDetalhes.Select(r => r.ReceitaId).Distinct().Count(),
            allParcelas.Count(p => p.IsPaid
                && p.DataPagamento >= request.DataInicio
                && p.DataPagamento <= request.DataFim),
            allParcelas.Count(p => !p.IsPaid),
            porTipo,
            receitaDetalhes);
    }
}
