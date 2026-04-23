using BalanceProjectionApp.Domain.Enums;
using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.AtualizarDespesa;

public class AtualizarDespesaCommandValidator : AbstractValidator<AtualizarDespesaCommand>
{
    public AtualizarDespesaCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Nome).NotEmpty().MaximumLength(200);
    }
}
