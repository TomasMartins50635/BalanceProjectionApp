using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Despesas.Commands.AdicionarParcelaDespesa;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace BalanceProjectionApp.Application.Tests;

public class AdicionarParcelaDespesaHandlerTests
{
    private readonly IDespesaRepository _despesaRepo = Substitute.For<IDespesaRepository>();
    private readonly IParcelaRepository _parcelaRepo = Substitute.For<IParcelaRepository>();
    private readonly IFinanciamentoRepository _financiamentoRepo = Substitute.For<IFinanciamentoRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly AdicionarParcelaDespesaCommandHandler _handler;

    public AdicionarParcelaDespesaHandlerTests()
    {
        _handler = new AdicionarParcelaDespesaCommandHandler(_despesaRepo, _parcelaRepo, _financiamentoRepo, _uow);
    }

    [Fact]
    public async Task Handle_DespesaAssociadaAFinanciamento_ImpedeUltrapassarValorRestante()
    {
        var contaId = Guid.NewGuid();
        var despesa = Despesa.Criar(
            "Financiamento",
            contaId,
            tipo: TipoDespesa.Fixa,
            valorFixo: 80m,
            periodicidade: Periodicidade.Mensal,
            dataInicio: new DateOnly(2026, 6, 1));

        despesa.GerarProximaParcela();
        var financiamento = Financiamento.Criar("F", 100m, new DateOnly(2026, 6, 1), contaId, despesa.Id);

        _despesaRepo.ObterPorIdComParcelasAsync(despesa.Id, Arg.Any<CancellationToken>()).Returns(despesa);
        _financiamentoRepo.ObterPorDespesaIdAsync(despesa.Id, Arg.Any<CancellationToken>()).Returns(financiamento);

        var act = async () => await _handler.Handle(
            new AdicionarParcelaDespesaCommand(despesa.Id, new DateOnly(2026, 7, 1), 30m),
            CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("*ultrapassa o valor restante do financiamento*");
        await _parcelaRepo.DidNotReceive().AdicionarAsync(Arg.Any<Parcela>(), Arg.Any<CancellationToken>());
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_DespesaAssociadaAFinanciamento_AdicionaParcelaQuandoCabeNoSaldo()
    {
        var contaId = Guid.NewGuid();
        var despesa = Despesa.Criar(
            "Financiamento",
            contaId,
            tipo: TipoDespesa.Fixa,
            valorFixo: 80m,
            periodicidade: Periodicidade.Mensal,
            dataInicio: new DateOnly(2026, 6, 1));

        despesa.GerarProximaParcela();
        var financiamento = Financiamento.Criar("F", 100m, new DateOnly(2026, 6, 1), contaId, despesa.Id);

        _despesaRepo.ObterPorIdComParcelasAsync(despesa.Id, Arg.Any<CancellationToken>()).Returns(despesa);
        _financiamentoRepo.ObterPorDespesaIdAsync(despesa.Id, Arg.Any<CancellationToken>()).Returns(financiamento);

        await _handler.Handle(
            new AdicionarParcelaDespesaCommand(despesa.Id, new DateOnly(2026, 7, 1), 20m),
            CancellationToken.None);

        await _parcelaRepo.Received(1).AdicionarAsync(Arg.Is<Parcela>(p => p.ValorLiquido == 20m), Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}