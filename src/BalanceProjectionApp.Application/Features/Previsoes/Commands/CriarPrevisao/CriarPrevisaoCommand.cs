using MediatR;

namespace BalanceProjectionApp.Application.Features.Previsoes.Commands.CriarPrevisao;

public record CriarPrevisaoCommand(
    string Nome,
    Guid? ContaId,
    int? DiasEntreVendas,
    decimal? ValorMedioVenda,
    int? DiasEntreArrendamentos,
    decimal? ValorMedioArrendamento) : IRequest<Guid>;
