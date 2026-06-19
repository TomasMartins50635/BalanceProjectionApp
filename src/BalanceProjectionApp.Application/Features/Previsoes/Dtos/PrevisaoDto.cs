namespace BalanceProjectionApp.Application.Features.Previsoes.Dtos;

public record PrevisaoDto(
    Guid Id,
    string Nome,
    Guid? ContaId,
    int? DiasEntreVendas,
    decimal? ValorMedioVenda,
    int? DiasEntreArrendamentos,
    decimal? ValorMedioArrendamento,
    DateTime CriadoEm);

public record DefaultsPrevisaoDto(
    int? DiasEntreVendas,
    decimal? ValorMedioVenda,
    int? DiasEntreArrendamentos,
    decimal? ValorMedioArrendamento);
