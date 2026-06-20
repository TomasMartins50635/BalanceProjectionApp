using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.AtualizarDespesa;

public class AtualizarDespesaCommandValidator : AbstractValidator<AtualizarDespesaCommand>
{
    public AtualizarDespesaCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();

        // Modo normal (nome obrigatório quando ValorFixo não é fornecido)
        When(x => !x.ValorFixo.HasValue, () =>
            RuleFor(x => x.Nome).NotEmpty().MaximumLength(200));

        // Modo financiamento (ValorFixo e Periodicidade obrigatórios)
        When(x => x.ValorFixo.HasValue, () =>
        {
            RuleFor(x => x.ValorFixo).GreaterThan(0);
            RuleFor(x => x.Periodicidade).NotNull();
        });
    }
}
