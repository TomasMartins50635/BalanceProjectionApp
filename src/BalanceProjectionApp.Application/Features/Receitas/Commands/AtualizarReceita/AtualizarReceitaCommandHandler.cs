using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.AtualizarReceita;

public class AtualizarReceitaCommandHandler(
    IReceitaRepository receitaRepository,
    IColaboradorRepository colaboradorRepository,
    IUnitOfWork uow) : IRequestHandler<AtualizarReceitaCommand>
{
    public async Task Handle(AtualizarReceitaCommand request, CancellationToken cancellationToken)
    {
        var receita = await receitaRepository.ObterPorIdComParcelasAsync(request.Id, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Receita), request.Id);

        receita.Atualizar(request.Nome, request.Categoria);

        if (request.ColaboradorId != receita.ColaboradorId)
        {
            if (request.ColaboradorId.HasValue)
            {
                var colaborador = await colaboradorRepository.ObterPorIdAsync(request.ColaboradorId.Value, cancellationToken)
                    ?? throw new EntityNotFoundException(nameof(Colaborador), request.ColaboradorId.Value);
                receita.AssociarColaborador(colaborador);
            }
            else
            {
                receita.RemoverColaborador();
            }
        }

        receita.RemoverParcelasNaoPagas();

        foreach (var p in request.Parcelas.OrderBy(p => p.Numero))
            receita.AdicionarParcela(p.Numero, p.DataVencimento, p.Valor);

        await uow.SaveChangesAsync(cancellationToken);
    }
}
