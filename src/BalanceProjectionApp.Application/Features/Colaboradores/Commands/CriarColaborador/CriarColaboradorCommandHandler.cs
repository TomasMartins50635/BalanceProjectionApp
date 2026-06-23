using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Colaboradores.Commands.CriarColaborador;

public class CriarColaboradorCommandHandler(
    IColaboradorRepository colaboradorRepository,
    IUnitOfWork uow) : IRequestHandler<CriarColaboradorCommand, Guid>
{
    public async Task<Guid> Handle(CriarColaboradorCommand request, CancellationToken cancellationToken)
    {
        var colaborador = request.Tipo == TipoColaborador.Comercial
            ? Colaborador.CriarComercial(request.Nome, request.PercentagemVenda!.Value, request.PercentagemAngariacao!.Value)
            : Colaborador.CriarServico(request.Nome, request.PercentagemServico!.Value);

        await colaboradorRepository.AdicionarAsync(colaborador, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);
        return colaborador.Id;
    }
}
