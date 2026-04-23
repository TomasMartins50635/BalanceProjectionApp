using BalanceProjectionApp.Domain.Enums;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.AtualizarDespesa;

public record AtualizarDespesaCommand(Guid Id, string Nome, CategoriaContrato? Categoria) : IRequest;
