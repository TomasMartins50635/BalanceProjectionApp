using BalanceProjectionApp.Application.Features.Contas.Dtos;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Contas.Queries.ObterConta;

public class ObterContaQueryHandler(IContaRepository repository)
    : IRequestHandler<ObterContaQuery, ContaDto?>
{
    public async Task<ContaDto?> Handle(ObterContaQuery request, CancellationToken ct)
    {
        var conta = await repository.ObterPorIdAsync(request.Id, ct);
        if (conta is null) return null;
        return new ContaDto(conta.Id, conta.Nome, conta.Saldo);
    }
}
