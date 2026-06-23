using BalanceProjectionApp.Domain.Enums;
using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Colaboradores.Commands.CriarColaborador;

public class CriarColaboradorCommandValidator : AbstractValidator<CriarColaboradorCommand>
{
    public CriarColaboradorCommandValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().MaximumLength(200);

        When(x => x.Tipo == TipoColaborador.Comercial, () =>
        {
            RuleFor(x => x.PercentagemVenda)
                .NotNull().WithMessage("PercentagemVenda é obrigatória para colaboradores Comerciais.")
                .InclusiveBetween(0, 100).When(x => x.PercentagemVenda.HasValue);
            RuleFor(x => x.PercentagemAngariacao)
                .NotNull().WithMessage("PercentagemAngariacao é obrigatória para colaboradores Comerciais.")
                .InclusiveBetween(0, 100).When(x => x.PercentagemAngariacao.HasValue);
        });

        When(x => x.Tipo == TipoColaborador.Servico, () =>
        {
            RuleFor(x => x.PercentagemServico)
                .NotNull().WithMessage("PercentagemServico é obrigatória para colaboradores de Serviço.")
                .InclusiveBetween(0, 100).When(x => x.PercentagemServico.HasValue);
        });
    }
}
