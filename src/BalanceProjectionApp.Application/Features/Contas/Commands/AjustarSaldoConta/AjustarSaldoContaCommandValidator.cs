using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Contas.Commands.AjustarSaldoConta;

public class AjustarSaldoContaCommandValidator : AbstractValidator<AjustarSaldoContaCommand>
{
    public AjustarSaldoContaCommandValidator()
    {
        RuleFor(x => x.ContaId).NotEmpty();
    }
}
