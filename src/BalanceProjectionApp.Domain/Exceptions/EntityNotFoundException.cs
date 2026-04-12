namespace BalanceProjectionApp.Domain.Exceptions;

public class EntityNotFoundException(string entityName, object key)
    : DomainException($"{entityName} com id '{key}' não foi encontrado.");
