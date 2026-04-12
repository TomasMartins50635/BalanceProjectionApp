using BalanceProjectionApp.Application.Features.Parcelas.Dtos;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Parcelas.Queries.ListarParcelas;

/// <summary>Lista parcelas por conta. Filtra opcionalmente por estado de pagamento.</summary>
public record ListarParcelasQuery(Guid ContaId, bool? ApenasPendentes = null) : IRequest<IEnumerable<ParcelaDto>>;
