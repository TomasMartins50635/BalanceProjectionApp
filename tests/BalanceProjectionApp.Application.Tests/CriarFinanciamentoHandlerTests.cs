using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Financiamentos.Commands.CriarFinanciamento;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace BalanceProjectionApp.Application.Tests;

public class CriarFinanciamentoHandlerTests
{
    private readonly IFinanciamentoRepository _financiamentoRepo = Substitute.For<IFinanciamentoRepository>();
    private readonly IDespesaRepository _despesaRepo = Substitute.For<IDespesaRepository>();
    private readonly IContaRepository _contaRepo = Substitute.For<IContaRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly CriarFinanciamentoCommandHandler _handler;

    private static readonly Guid ContaId = Guid.NewGuid();

    public CriarFinanciamentoHandlerTests()
    {
        _handler = new CriarFinanciamentoCommandHandler(_financiamentoRepo, _despesaRepo, _contaRepo, _uow);
    }

    [Fact]
    public async Task Handle_DadosValidos_CreditaContaImediatamente()
    {
        var conta = Conta.Criar("Conta", 0m);
        _contaRepo.ObterPorIdAsync(ContaId, Arg.Any<CancellationToken>()).Returns(conta);

        await _handler.Handle(new CriarFinanciamentoCommand("Empréstimo", 5_000m, ContaId, 500m),
            CancellationToken.None);

        conta.Saldo.Should().Be(5_000m);
    }

    [Fact]
    public async Task Handle_DadosValidos_AdicionaFinanciamentoERetornaId()
    {
        var conta = Conta.Criar("Conta", 0m);
        _contaRepo.ObterPorIdAsync(ContaId, Arg.Any<CancellationToken>()).Returns(conta);

        var id = await _handler.Handle(
            new CriarFinanciamentoCommand("Empréstimo", 5_000m, ContaId, 500m),
            CancellationToken.None);

        id.Should().NotBeEmpty();
        await _despesaRepo.Received(1).AdicionarAsync(Arg.Any<Despesa>(), Arg.Any<CancellationToken>());
        await _financiamentoRepo.Received(1).AdicionarAsync(Arg.Any<Financiamento>(), Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_DadosValidos_CriaDespesaFixaAtivaAssociadaComPrimeiraParcela()
    {
        var conta = Conta.Criar("Conta", 0m);
        _contaRepo.ObterPorIdAsync(ContaId, Arg.Any<CancellationToken>()).Returns(conta);

        await _handler.Handle(
            new CriarFinanciamentoCommand("Notebook", 5_000m, ContaId, 420m),
            CancellationToken.None);

        await _despesaRepo.Received(1).AdicionarAsync(
            Arg.Is<Despesa>(d =>
                d.Nome == "Notebook"
                && d.ContaId == conta.Id
                && d.TipoDespesa == Domain.Enums.TipoDespesa.Fixa
                && d.Categoria == Domain.Enums.CategoriaContrato.Financiamento
                && d.ValorFixo == 420m
                && d.IsActive
                && d.Parcelas.Count == 1
                && d.Parcelas.Single().Numero == 1
                && d.Parcelas.Single().ValorBruto == 420m),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_MensalidadeMaiorQueFinanciamento_LancaDomainException()
    {
        var conta = Conta.Criar("Conta", 0m);
        _contaRepo.ObterPorIdAsync(ContaId, Arg.Any<CancellationToken>()).Returns(conta);

        var act = async () => await _handler.Handle(
            new CriarFinanciamentoCommand("Notebook", 300m, ContaId, 420m),
            CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("*mensalidade não pode ultrapassar o valor do financiamento*");
        await _despesaRepo.DidNotReceive().AdicionarAsync(Arg.Any<Despesa>(), Arg.Any<CancellationToken>());
        await _financiamentoRepo.DidNotReceive().AdicionarAsync(Arg.Any<Financiamento>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ContaNaoExiste_LancaEntityNotFoundException()
    {
        _contaRepo.ObterPorIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Conta?)null);

        var act = async () => await _handler.Handle(
            new CriarFinanciamentoCommand("Empréstimo", 1_000m, Guid.NewGuid(), 100m),
            CancellationToken.None);

        await act.Should().ThrowAsync<EntityNotFoundException>();
        await _financiamentoRepo.DidNotReceive().AdicionarAsync(Arg.Any<Financiamento>(), Arg.Any<CancellationToken>());
        await _despesaRepo.DidNotReceive().AdicionarAsync(Arg.Any<Despesa>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_VariosFinanciamentos_SaldoAcumulado()
    {
        var conta = Conta.Criar("Conta", 1_000m);
        _contaRepo.ObterPorIdAsync(ContaId, Arg.Any<CancellationToken>()).Returns(conta);

        await _handler.Handle(new CriarFinanciamentoCommand("F1", 3_000m, ContaId, 300m), CancellationToken.None);
        await _handler.Handle(new CriarFinanciamentoCommand("F2", 2_000m, ContaId, 200m), CancellationToken.None);

        conta.Saldo.Should().Be(6_000m); // 1000 + 3000 + 2000
    }
}
