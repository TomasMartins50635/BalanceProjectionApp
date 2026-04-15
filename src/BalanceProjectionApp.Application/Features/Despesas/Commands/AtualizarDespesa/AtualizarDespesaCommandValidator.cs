using BalanceProjectionApp.Domain.Enums;
using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.AtualizarDespesa;

public class AtualizarDespesaCommandValidator : AbstractValidator<AtualizarDespesaCommand>
{
    public AtualizarDespesaCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Nome).NotEmpty().MaximumLength(200);

        When(x => x.ValorFixo.HasValue, () =>
            RuleFor(x => x.ValorFixo!.Value).GreaterThan(0).WithMessage("O valor fixo deve ser positivo."));

        When(x => x.Parcelas != null, () =>
        {
            RuleFor(x => x.Parcelas).NotEmpty().WithMessage("A lista de parcelas não pode estar vazia.");
            RuleForEach(x => x.Parcelas).ChildRules(p =>
            {
                p.RuleFor(x => x.ValorBruto).GreaterThan(0).WithMessage("O valor da parcela deve ser positivo.");
            });
        });
    }
}
