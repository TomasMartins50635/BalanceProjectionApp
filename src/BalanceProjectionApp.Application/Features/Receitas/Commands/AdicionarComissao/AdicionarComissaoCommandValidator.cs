using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.AdicionarComissao;

public class AdicionarComissaoCommandValidator : AbstractValidator<AdicionarComissaoCommand>
{
    public AdicionarComissaoCommandValidator()
    {
        RuleFor(x => x.ReceitaId).NotEmpty();
        RuleFor(x => x.ColaboradorId).NotEmpty();
        RuleFor(x => x.Percentagem).GreaterThan(0).LessThanOrEqualTo(100);
    }
}
