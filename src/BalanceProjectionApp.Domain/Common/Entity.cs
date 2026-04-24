namespace BalanceProjectionApp.Domain.Common;

public abstract class Entity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; protected set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; protected set; } = DateTime.UtcNow;
    public bool IsDeleted { get; protected set; }

    public void Deletar()
    {
        IsDeleted = true;
        UpdatedAt = DateTime.UtcNow;
    }
}
