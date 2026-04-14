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
    public async Task Handle(EliminarColaboradorCommand request, CancellationToken ct)
    {
        var colaborador = await colaboradorRepository.ObterPorIdAsync(request.Id, ct)
            ?? throw new EntityNotFoundException(nameof(Colaborador), request.Id);

        colaborador.Desativar();
        await uow.SaveChangesAsync(ct);
    }
}
