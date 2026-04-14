using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Colaboradores.Commands.CriarColaborador;

public class CriarColaboradorCommandValidator : AbstractValidator<CriarColaboradorCommand>
{
    public CriarColaboradorCommandValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Percentagem).InclusiveBetween(0, 100);
    }
}
