using MediatR;

namespace BalanceProjectionApp.Application.Features.Financiamentos.Commands.CriarFinanciamento;

public record CriarFinanciamentoCommand(
    string Nome,
    decimal Valor,
    DateOnly Data,
    Guid ContaId,
    Guid? DespesaId) : IRequest<Guid>;
