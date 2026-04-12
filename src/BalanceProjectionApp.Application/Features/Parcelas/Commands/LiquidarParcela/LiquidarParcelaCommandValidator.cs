using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Parcelas.Commands.LiquidarParcela;

public class LiquidarParcelaCommandValidator : AbstractValidator<LiquidarParcelaCommand>
{
    public LiquidarParcelaCommandValidator()
    {
        RuleFor(x => x.ParcelaId).NotEmpty();
    }
}
