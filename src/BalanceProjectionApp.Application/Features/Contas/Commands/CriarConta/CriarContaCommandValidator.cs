using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Contas.Commands.CriarConta;

public class CriarContaCommandValidator : AbstractValidator<CriarContaCommand>
{
    public CriarContaCommandValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().MaximumLength(200);
        RuleFor(x => x.SaldoInicial).GreaterThanOrEqualTo(0);
    }
}
