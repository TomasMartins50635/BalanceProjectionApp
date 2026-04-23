using MediatR;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.AdicionarParcelaDespesa;

public record AdicionarParcelaDespesaCommand(
    Guid DespesaId,
    DateOnly DataVencimento,
    decimal ValorBruto) : IRequest;
