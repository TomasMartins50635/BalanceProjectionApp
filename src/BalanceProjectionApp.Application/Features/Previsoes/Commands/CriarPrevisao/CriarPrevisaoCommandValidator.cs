using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Previsoes.Commands.CriarPrevisao;

public class CriarPrevisaoCommandValidator : AbstractValidator<CriarPrevisaoCommand>
{
    public CriarPrevisaoCommandValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().MaximumLength(200);
        RuleFor(x => x.DiasEntreVendas).GreaterThan(0).When(x => x.DiasEntreVendas.HasValue);
        RuleFor(x => x.ValorMedioVenda).GreaterThan(0).When(x => x.ValorMedioVenda.HasValue);
        RuleFor(x => x.DiasEntreArrendamentos).GreaterThan(0).When(x => x.DiasEntreArrendamentos.HasValue);
        RuleFor(x => x.ValorMedioArrendamento).GreaterThan(0).When(x => x.ValorMedioArrendamento.HasValue);
    }
}
