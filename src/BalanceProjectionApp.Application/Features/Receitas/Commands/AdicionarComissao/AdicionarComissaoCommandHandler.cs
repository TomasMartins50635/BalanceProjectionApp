using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.AdicionarComissao;

public class AdicionarComissaoCommandHandler(
    IReceitaRepository receitaRepository,
    IColaboradorRepository colaboradorRepository,
    IUnitOfWork uow) : IRequestHandler<AdicionarComissaoCommand, Guid>
{
    public async Task<Guid> Handle(AdicionarComissaoCommand request, CancellationToken cancellationToken)
    {
        var receita = await receitaRepository.ObterPorIdComComissoesAsync(request.ReceitaId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Receita), request.ReceitaId);

        var colaborador = await colaboradorRepository.ObterPorIdAsync(request.ColaboradorId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Colaborador), request.ColaboradorId);

        var comissao = receita.AdicionarComissao(colaborador, request.TipoComissao, request.Percentagem);
        await receitaRepository.AdicionarComissaoAsync(comissao, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);
        return comissao.Id;
    }
}
