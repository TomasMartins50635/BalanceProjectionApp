using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Colaboradores.Commands.EliminarColaborador;

public class EliminarColaboradorCommandHandler(
    IColaboradorRepository colaboradorRepository,
    IUnitOfWork uow) : IRequestHandler<EliminarColaboradorCommand>
{
    public async Task Handle(EliminarColaboradorCommand request, CancellationToken cancellationToken)
    {
        var colaborador = await colaboradorRepository.ObterPorIdAsync(request.Id, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Colaborador), request.Id);

        colaborador.Deletar();
        await uow.SaveChangesAsync(cancellationToken);
    }
}
