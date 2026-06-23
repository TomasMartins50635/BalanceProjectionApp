using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.CriarReceita;

public class CriarReceitaCommandValidator : AbstractValidator<CriarReceitaCommand>
{
    public CriarReceitaCommandValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ContaId).NotEmpty();
        RuleFor(x => x.Parcelas).NotEmpty().WithMessage("A receita deve ter pelo menos uma parcela.");
        RuleForEach(x => x.Parcelas).ChildRules(p =>
        {
            p.RuleFor(x => x.Numero).GreaterThan(0);
            p.RuleFor(x => x.Valor).GreaterThan(0);
        });
        RuleForEach(x => x.Comissoes).ChildRules(c =>
        {
            c.RuleFor(x => x.ColaboradorId).NotEmpty();
            c.RuleFor(x => x.Percentagem).GreaterThan(0).LessThanOrEqualTo(100);
        }).When(x => x.Comissoes != null);
    }
}
