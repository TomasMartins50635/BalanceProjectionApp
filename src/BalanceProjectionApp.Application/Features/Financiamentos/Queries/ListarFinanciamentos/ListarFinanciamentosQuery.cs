using BalanceProjectionApp.Application.Features.Financiamentos.Dtos;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Financiamentos.Queries.ListarFinanciamentos;

public record ListarFinanciamentosQuery(Guid ContaId) : IRequest<IEnumerable<FinanciamentoDto>>;
