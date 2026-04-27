using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Financiamentos.Commands.CriarFinanciamento;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
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
    private static readonly DateOnly PrimeiraParcela = new(2026, 6, 1);

    public CriarFinanciamentoHandlerTests()
    {
        _handler = new CriarFinanciamentoCommandHandler(_financiamentoRepo, _despesaRepo, _contaRepo, _uow);
    }

    private CriarFinanciamentoCommand CmdPadrao(decimal valor = 5_000m, decimal prestacao = 500m,
        Periodicidade periodicidade = Periodicidade.Mensal)
        => new("Empréstimo", valor, ContaId, prestacao, periodicidade, PrimeiraParcela);

    [Fact]
    public async Task Handle_DadosValidos_CreditaContaImediatamente()
    {
        var conta = Conta.Criar("Conta", 0m);
        _contaRepo.ObterPorIdAsync(ContaId, Arg.Any<CancellationToken>()).Returns(conta);

        await _handler.Handle(CmdPadrao(), CancellationToken.None);

        conta.Saldo.Should().Be(5_000m);
    }

    [Fact]
    public async Task Handle_DadosValidos_AdicionaFinanciamentoERetornaId()
    {
        var conta = Conta.Criar("Conta", 0m);
        _contaRepo.ObterPorIdAsync(ContaId, Arg.Any<CancellationToken>()).Returns(conta);

        var id = await _handler.Handle(CmdPadrao(), CancellationToken.None);

        id.Should().NotBeEmpty();
        await _despesaRepo.Received(1).AdicionarAsync(Arg.Any<Despesa>(), Arg.Any<CancellationToken>());
        await _financiamentoRepo.Received(1).AdicionarAsync(Arg.Any<Financiamento>(), Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_DadosValidos_CriaDespesaFixaComPeriodicidadeEDataCorretas()
    {
        var conta = Conta.Criar("Conta", 0m);
        _contaRepo.ObterPorIdAsync(ContaId, Arg.Any<CancellationToken>()).Returns(conta);

        await _handler.Handle(
            new CriarFinanciamentoCommand("Notebook", 5_000m, ContaId, 420m, Periodicidade.Trimestral, PrimeiraParcela),
            CancellationToken.None);

        await _despesaRepo.Received(1).AdicionarAsync(
            Arg.Is<Despesa>(d =>
                d.Nome == "Notebook"
                && d.TipoDespesa == TipoDespesa.Fixa
                && d.Categoria == CategoriaContrato.Financiamento
                && d.ValorFixo == 420m
                && d.Periodicidade == Periodicidade.Trimestral
                && d.DataInicio == PrimeiraParcela
                && d.IsActive
                && d.Parcelas.Count == 1
                && d.Parcelas.Single().DataVencimento == PrimeiraParcela),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_PrestacaoMaiorQueFinanciamento_LancaDomainException()
    {
        var conta = Conta.Criar("Conta", 0m);
        _contaRepo.ObterPorIdAsync(ContaId, Arg.Any<CancellationToken>()).Returns(conta);

        var act = async () => await _handler.Handle(
            new CriarFinanciamentoCommand("Notebook", 300m, ContaId, 420m, Periodicidade.Mensal, PrimeiraParcela),
            CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("*prestação não pode ultrapassar o valor do financiamento*");
        await _despesaRepo.DidNotReceive().AdicionarAsync(Arg.Any<Despesa>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ContaNaoExiste_LancaEntityNotFoundException()
    {
        _contaRepo.ObterPorIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Conta?)null);

        var act = async () => await _handler.Handle(
            new CriarFinanciamentoCommand("Empréstimo", 1_000m, Guid.NewGuid(), 100m, Periodicidade.Mensal, PrimeiraParcela),
            CancellationToken.None);

        await act.Should().ThrowAsync<EntityNotFoundException>();
    }
}
