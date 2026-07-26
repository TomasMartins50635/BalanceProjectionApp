using BalanceProjectionApp.Application.Features.Parcelas.Dtos;
using BalanceProjectionApp.Application.Features.Receitas.Dtos;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Queries.ListarReceitas;

public class ListarReceitasQueryHandler(IReceitaRepository repository)
    : IRequestHandler<ListarReceitasQuery, IEnumerable<ReceitaDto>>
{
    public async Task<IEnumerable<ReceitaDto>> Handle(ListarReceitasQuery request, CancellationToken cancellationToken)
    {
        var receitas = await repository.ListarAsync(cancellationToken);
        return receitas.Select(r => new ReceitaDto(
            r.Id,
            r.Nome,
            r.Categoria,
            r.ContaId,
            r.Parcelas.Where(p => !p.IsDeleted).Sum(p => p.ValorBruto),
            r.CreatedAt,
            r.UpdatedAt,
            r.Comissoes.Where(c => !c.IsDeleted).Select(c => new ReceitaComissaoDto(
                c.Id,
                c.ColaboradorId,
                c.Colaborador?.Nome ?? string.Empty,
                c.TipoComissao,
                c.Percentagem)),
            r.Parcelas.Select(p => new ParcelaDto(
                p.Id, p.Numero, p.DataVencimento,
                p.ValorBruto, p.ValorLiquido,
                p.IsPaid, p.DataPagamento.HasValue ? DateOnly.FromDateTime(p.DataPagamento.Value) : null,
                p.ReceitaId, p.DespesaId, p.ContaId, p.Percentagem, r.Nome)),
            r.TemIva));
    }
}
