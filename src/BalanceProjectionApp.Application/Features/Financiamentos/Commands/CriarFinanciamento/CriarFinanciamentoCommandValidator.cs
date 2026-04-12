using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Financiamentos.Commands.CriarFinanciamento;

public class CriarFinanciamentoCommandValidator : AbstractValidator<CriarFinanciamentoCommand>
{
    public CriarFinanciamentoCommandValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Valor).GreaterThan(0);
        RuleFor(x => x.ContaId).NotEmpty();
    }
}
