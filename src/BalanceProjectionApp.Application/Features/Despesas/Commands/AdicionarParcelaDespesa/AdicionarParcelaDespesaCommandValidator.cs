using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.AdicionarParcelaDespesa;

public class AdicionarParcelaDespesaCommandValidator : AbstractValidator<AdicionarParcelaDespesaCommand>
{
    public AdicionarParcelaDespesaCommandValidator()
    {
        RuleFor(x => x.DespesaId).NotEmpty();
        RuleFor(x => x.ValorBruto).GreaterThan(0).WithMessage("O valor da parcela deve ser positivo.");
    }
}
