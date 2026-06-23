using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Colaboradores.Commands.AtualizarColaborador;

public class AtualizarColaboradorCommandHandler(
    IColaboradorRepository colaboradorRepository,
    IUnitOfWork uow) : IRequestHandler<AtualizarColaboradorCommand>
{
    public async Task Handle(AtualizarColaboradorCommand request, CancellationToken cancellationToken)
    {
        var colaborador = await colaboradorRepository.ObterPorIdAsync(request.Id, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Colaborador), request.Id);

        colaborador.Atualizar(request.Nome, request.PercentagemVenda, request.PercentagemAngariacao, request.PercentagemServico);
        await uow.SaveChangesAsync(cancellationToken);
    }
}
