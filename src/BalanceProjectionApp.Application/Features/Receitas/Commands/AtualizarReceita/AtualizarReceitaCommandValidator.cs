using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.AtualizarReceita;

public class AtualizarReceitaCommandValidator : AbstractValidator<AtualizarReceitaCommand>
{
    public AtualizarReceitaCommandValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Parcelas).NotEmpty().WithMessage("A receita deve ter pelo menos uma parcela.");
        RuleForEach(x => x.Parcelas).ChildRules(p =>
        {
            p.RuleFor(x => x.Numero).GreaterThan(0);
            p.RuleFor(x => x.Valor).GreaterThan(0);
        });
    }
}
