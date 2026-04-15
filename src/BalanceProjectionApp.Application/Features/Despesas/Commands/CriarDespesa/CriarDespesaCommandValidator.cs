using BalanceProjectionApp.Domain.Enums;
using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.CriarDespesa;

public class CriarDespesaCommandValidator : AbstractValidator<CriarDespesaCommand>
{
    public CriarDespesaCommandValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ContaId).NotEmpty();

        // Fixa
        When(x => x.TipoDespesa == TipoDespesa.Fixa, () =>
        {
            RuleFor(x => x.ValorFixo).NotNull().GreaterThan(0)
                .WithMessage("Despesa fixa requer um valor fixo positivo.");
            RuleFor(x => x.Periodicidade).NotNull()
                .WithMessage("Despesa fixa requer uma periodicidade.");
            RuleFor(x => x.DataInicio).NotNull()
                .WithMessage("Despesa fixa requer uma data de início.");
        });

        // Pontual e Recorrente
        When(x => x.TipoDespesa != TipoDespesa.Fixa, () =>
        {
            RuleFor(x => x.Parcelas).NotEmpty()
                .WithMessage("A despesa deve ter pelo menos uma parcela.");
            RuleForEach(x => x.Parcelas).ChildRules(p =>
            {
                p.RuleFor(x => x.Numero).GreaterThan(0);
                p.RuleFor(x => x.ValorBruto).GreaterThan(0);
            });
        });
    }
}
