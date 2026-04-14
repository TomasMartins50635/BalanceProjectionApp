using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.AtualizarReceita;

public class AtualizarReceitaCommandValidator : AbstractValidator<AtualizarReceitaCommand>
{
    public AtualizarReceitaCommandValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ValorTotal).GreaterThan(0);
        RuleFor(x => x.Categoria).MaximumLength(100).When(x => x.Categoria != null);
        RuleForEach(x => x.Parcelas).ChildRules(p =>
        {
            p.RuleFor(x => x.Numero).GreaterThan(0);
            p.RuleFor(x => x.Percentagem).GreaterThan(0).LessThanOrEqualTo(100);
        });
    }
}
