using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Colaboradores.Commands.CriarColaborador;

public class CriarColaboradorCommandHandler(
    IColaboradorRepository colaboradorRepository,
    IUnitOfWork uow) : IRequestHandler<CriarColaboradorCommand, Guid>
{
    public async Task<Guid> Handle(CriarColaboradorCommand request, CancellationToken cancellationToken)
    {
        var colaborador = Colaborador.Criar(request.Nome, request.Percentagem);
        await colaboradorRepository.AdicionarAsync(colaborador, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);
        return colaborador.Id;
    }
}
