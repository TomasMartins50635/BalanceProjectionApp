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

        if (despesa.Categoria == CategoriaContrato.IVA || despesa.Categoria == CategoriaContrato.Comissao)
            throw new DomainException("Despesas de IVA ou Comissão não podem ser editadas.");

        if (despesa.Categoria == CategoriaContrato.Financiamento)
        {
            if (request.ValorFixo.HasValue)
                despesa.AtualizarValorFixo(request.ValorFixo.Value);
            if (request.Periodicidade.HasValue)
                despesa.AtualizarPeriodicidade(request.Periodicidade.Value);
        }
        else
        {
            despesa.Atualizar(request.Nome!, request.Categoria);
        }

        await uow.SaveChangesAsync(cancellationToken);
    }
}
