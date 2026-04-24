using MediatR;

namespace BalanceProjectionApp.Application.Features.Financiamentos.Commands.CriarFinanciamento;

public record CriarFinanciamentoCommand(
    string Nome,
    decimal Valor,
    Guid ContaId,
    decimal ValorMensalidade) : IRequest<Guid>;
