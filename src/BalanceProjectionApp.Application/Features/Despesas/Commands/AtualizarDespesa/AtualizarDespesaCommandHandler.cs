using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.AtualizarDespesa;

public class AtualizarDespesaCommandHandler(
    IDespesaRepository despesaRepository,
    IUnitOfWork uow) : IRequestHandler<AtualizarDespesaCommand>
{
    public async Task Handle(AtualizarDespesaCommand request, CancellationToken cancellationToken)
    {
        var despesa = await despesaRepository.ObterPorIdComParcelasAsync(request.Id, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Despesa), request.Id);

        if (despesa.Categoria == CategoriaContrato.IVA)
            throw new DomainException("Despesas de IVA não podem ser editadas.");

        despesa.Atualizar(request.Nome, request.Categoria);

        await uow.SaveChangesAsync(cancellationToken);
    }
}
