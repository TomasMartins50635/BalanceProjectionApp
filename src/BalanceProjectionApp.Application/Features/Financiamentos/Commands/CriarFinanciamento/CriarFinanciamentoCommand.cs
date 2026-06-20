using BalanceProjectionApp.Domain.Enums;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Financiamentos.Commands.CriarFinanciamento;

public record CriarFinanciamentoCommand(
    string Nome,
    decimal Valor,
    Guid ContaId,
    decimal ValorPrestacao,
    Periodicidade Periodicidade,
    DateOnly DataPrimeiraParcela,
    bool CreditarConta = true) : IRequest<Guid>;
