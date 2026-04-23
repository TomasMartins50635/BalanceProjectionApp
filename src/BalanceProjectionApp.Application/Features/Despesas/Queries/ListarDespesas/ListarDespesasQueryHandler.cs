using BalanceProjectionApp.Application.Features.Despesas.Dtos;
using BalanceProjectionApp.Application.Features.Parcelas.Dtos;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Despesas.Queries.ListarDespesas;

public class ListarDespesasQueryHandler(IDespesaRepository repository)
    : IRequestHandler<ListarDespesasQuery, IEnumerable<DespesaDto>>
{
    public async Task<IEnumerable<DespesaDto>> Handle(ListarDespesasQuery request, CancellationToken ct)
    {
        var despesas = await repository.ListarAsync(ct);
        return despesas.Select(d => new DespesaDto(
            d.Id,
            d.Nome,
            d.Categoria,
            d.ContaId,
            d.TipoDespesa,
            d.ValorFixo,
            d.Periodicidade,
            d.DataInicio,
            d.IsActive,
            d.UpdatedAt,
            d.Parcelas.Select(p => new ParcelaDto(
                p.Id, p.Numero, p.DataVencimento,
                p.ValorBruto, p.ValorLiquido,
                p.IsPaid, p.DataPagamento.HasValue ? DateOnly.FromDateTime(p.DataPagamento.Value) : null,
                p.ReceitaId, p.DespesaId, p.ContaId, null, d.Nome))));
    }
}
