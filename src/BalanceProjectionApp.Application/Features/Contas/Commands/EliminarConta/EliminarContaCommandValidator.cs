using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Contas.Commands.EliminarConta;

public class EliminarContaCommandValidator : AbstractValidator<EliminarContaCommand>
{
    public EliminarContaCommandValidator()
    {
        RuleFor(x => x.ContaId).NotEmpty();
    }
}
