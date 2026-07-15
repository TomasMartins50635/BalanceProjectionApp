using BalanceProjectionApp.Domain.Enums;
using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.CriarDespesa;

public class CriarDespesaCommandValidator : AbstractValidator<CriarDespesaCommand>
{
    public CriarDespesaCommandValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ContaId).NotEmpty();

        RuleFor(x => x.Categoria)
            .Must(c => c != CategoriaContrato.IVA && c != CategoriaContrato.Financiamento && c != CategoriaContrato.Comissao)
            .When(x => x.Categoria.HasValue)
            .WithMessage("Não é possível criar manualmente despesas de IVA, Financiamento ou Comissão.");

        When(x => x.TipoDespesa != TipoDespesa.Pontual, () =>
        {
            RuleFor(x => x.ValorFixo).NotNull().GreaterThan(0)
                .WithMessage("Despesa fixa ou recorrente requer um valor positivo.");
            RuleFor(x => x.DataInicio).NotNull()
                .WithMessage("Despesa fixa ou recorrente requer uma data de início.");
        });

        When(x => x.TipoDespesa == TipoDespesa.Fixa || x.TipoDespesa == TipoDespesa.Recorrente, () =>
        {
            RuleFor(x => x.Periodicidade).NotNull()
                .WithMessage("Despesa fixa ou recorrente requer uma periodicidade.");
        });

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
    }
}
