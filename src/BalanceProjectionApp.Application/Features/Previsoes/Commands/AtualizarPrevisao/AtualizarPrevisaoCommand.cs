using MediatR;

namespace BalanceProjectionApp.Application.Features.Previsoes.Commands.AtualizarPrevisao;

public record AtualizarPrevisaoCommand(
    Guid Id,
    string Nome,
    int? DiasEntreVendas,
    decimal? ValorMedioVenda,
    int? DiasEntreArrendamentos,
    decimal? ValorMedioArrendamento) : IRequest;
