using BalanceProjectionApp.Domain.Enums;
using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.CriarDespesa;

public class CriarDespesaCommandValidator : AbstractValidator<CriarDespesaCommand>
{
    public CriarDespesaCommandValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ContaId).NotEmpty();

        // Fixa e Recorrente
        When(x => x.TipoDespesa != TipoDespesa.Pontual, () =>
        {
            RuleFor(x => x.ValorFixo).NotNull().GreaterThan(0)
                .WithMessage("Despesa fixa ou recorrente requer um valor positivo.");
            RuleFor(x => x.DataInicio).NotNull()
                .WithMessage("Despesa fixa ou recorrente requer uma data de início.");
        });

        // Fixa
        When(x => x.TipoDespesa == TipoDespesa.Fixa, () =>
        {
            RuleFor(x => x.Periodicidade).NotNull()
                .WithMessage("Despesa fixa requer uma periodicidade.");
        });

        // Pontual: parcelas manuais obrigatórias
        When(x => x.TipoDespesa == TipoDespesa.Pontual, () =>
        {
            RuleFor(x => x.Parcelas).NotEmpty()
                .WithMessage("A despesa pontual deve ter pelo menos uma parcela.");
            RuleForEach(x => x.Parcelas).ChildRules(p =>
            {
                p.RuleFor(x => x.Numero).GreaterThan(0);
                p.RuleFor(x => x.ValorBruto).GreaterThan(0);
            });
        });

        // Recorrente: data de início obrigatória (parcelas geradas automaticamente)
        When(x => x.TipoDespesa == TipoDespesa.Recorrente, () =>
        {
            RuleFor(x => x.DataInicio).NotNull()
                .WithMessage("Despesa recorrente requer uma data de início.");
        });
    }
}
