using BalanceProjectionApp.Application.Features.Parcelas.Dtos;
using BalanceProjectionApp.Application.Features.Receitas.Dtos;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Queries.ListarReceitas;

public class ListarReceitasQueryHandler(IReceitaRepository repository)
    : IRequestHandler<ListarReceitasQuery, IEnumerable<ReceitaDto>>
{
    public async Task<IEnumerable<ReceitaDto>> Handle(ListarReceitasQuery request, CancellationToken ct)
    {
        var receitas = await repository.ListarAsync(ct);
        return receitas.Select(r => new ReceitaDto(
            r.Id,
            r.Nome,
            r.Categoria,
            r.ContaId,
            r.ValorTotal,
            r.ColaboradorId,
            r.Colaborador?.Nome,
            r.Colaborador?.Percentagem,
            r.Parcelas.Select(p => new ParcelaDto(
                p.Id, p.Numero, p.DataVencimento,
                p.ValorBruto, p.ValorLiquido,
                p.IsPaid, p.DataPagamento.HasValue ? DateOnly.FromDateTime(p.DataPagamento.Value) : null,
                p.ReceitaId, p.DespesaId, p.Percentagem, r.Nome))));
    }
}
