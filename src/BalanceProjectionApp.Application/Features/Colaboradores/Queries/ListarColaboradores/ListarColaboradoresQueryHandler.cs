using BalanceProjectionApp.Application.Features.Colaboradores.Dtos;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Colaboradores.Queries.ListarColaboradores;

public class ListarColaboradoresQueryHandler(IColaboradorRepository repository)
    : IRequestHandler<ListarColaboradoresQuery, IEnumerable<ColaboradorDto>>
{
    public async Task<IEnumerable<ColaboradorDto>> Handle(ListarColaboradoresQuery request, CancellationToken cancellationToken)
    {
        var colaboradores = await repository.ListarAsync(cancellationToken);
        return colaboradores.Select(c => new ColaboradorDto(
            c.Id,
            c.Nome,
            c.Tipo,
            c.PercentagemVenda,
            c.PercentagemAngariacao,
            c.PercentagemServico));
    }
}
