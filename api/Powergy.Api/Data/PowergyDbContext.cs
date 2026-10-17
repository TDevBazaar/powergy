using Microsoft.EntityFrameworkCore;
using Powergy.Api.Models;

namespace Powergy.Api.Data;

public sealed class PowergyDbContext(DbContextOptions<PowergyDbContext> options)
    : DbContext(options)
{
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<CustomerOrder> CustomerOrders => Set<CustomerOrder>();
    public DbSet<CustomerOrderLine> CustomerOrderLines => Set<CustomerOrderLine>();
    public DbSet<CustomerOrderStatusHistory> CustomerOrderStatusHistory =>
        Set<CustomerOrderStatusHistory>();
    public DbSet<AdminAuditLog> AdminAuditLogs => Set<AdminAuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("categories");
            entity.HasKey(category => category.Id);
            entity.Property(category => category.Id).HasColumnName("id");
            entity.Property(category => category.Name)
                .HasColumnName("name").HasMaxLength(100).IsRequired();
            entity.Property(category => category.Slug)
                .HasColumnName("slug").HasMaxLength(120).IsRequired();
            entity.Property(category => category.SortOrder).HasColumnName("sort_order");
            entity.Property(category => category.IsActive).HasColumnName("is_active");
            entity.HasIndex(category => category.Slug).IsUnique();
            entity.Property(category => category.CreatedAt)
                .HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(category => category.UpdatedAt)
                .HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasData(
                new Category
                {
                    Id = Guid.Parse("8db8a34e-0709-4f7a-b2a4-a226fc359570"),
                    Name = "Estaciones de energía",
                    Slug = "estaciones-de-energia",
                    SortOrder = 1,
                    CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new Category
                {
                    Id = Guid.Parse("aa60039f-e0e0-4561-9b72-111fa7638575"),
                    Name = "Plantas eléctricas",
                    Slug = "plantas-electricas",
                    SortOrder = 2,
                    CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new Category
                {
                    Id = Guid.Parse("f74535c2-37c1-401c-b67b-665818f36a2d"),
                    Name = "Paneles solares",
                    Slug = "paneles-solares",
                    SortOrder = 3,
                    CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                });
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products");
            entity.HasKey(product => product.Id);
            entity.Property(product => product.Id).HasColumnName("id").HasMaxLength(100);
            entity.Property(product => product.Slug)
                .HasColumnName("slug").HasMaxLength(180).IsRequired();
            entity.HasIndex(product => product.Slug).IsUnique();
            entity.Property(product => product.CategoryId).HasColumnName("category_id");
            entity.Property(product => product.Subcategory)
                .HasColumnName("subcategory").HasMaxLength(120).IsRequired();
            entity.Property(product => product.Brand)
                .HasColumnName("brand").HasMaxLength(120).IsRequired();
            entity.Property(product => product.Model)
                .HasColumnName("model").HasMaxLength(180).IsRequired();
            entity.Property(product => product.Name)
                .HasColumnName("name").HasMaxLength(240).IsRequired();
            entity.Property(product => product.PriceUsd)
                .HasColumnName("price_usd").HasPrecision(12, 2);
            entity.Property(product => product.Specifications)
                .HasColumnName("specifications").IsRequired();
            entity.Property(product => product.PrimaryImage)
                .HasColumnName("primary_image").HasMaxLength(1000).IsRequired();
            entity.Property(product => product.OnSale).HasColumnName("on_sale");
            entity.Property(product => product.Warranty).HasColumnName("warranty");
            entity.Property(product => product.Transport).HasColumnName("transport");
            entity.Property(product => product.Invoice).HasColumnName("invoice");
            entity.Property(product => product.TopRank).HasColumnName("top_rank");
            entity.Property(product => product.IsActive).HasColumnName("is_active");
            entity.Property(product => product.CreatedAt)
                .HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(product => product.UpdatedAt)
                .HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasOne(product => product.Category)
                .WithMany(category => category.Products)
                .HasForeignKey(product => product.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(product => new { product.CategoryId, product.IsActive });
            entity.HasIndex(product => new { product.IsActive, product.TopRank, product.Name, product.Id });
            entity.HasIndex(product => new { product.TopRank, product.Name, product.Id });
            entity.HasIndex(product => product.OnSale);
        });

        modelBuilder.Entity<AdminUser>(entity =>
        {
            entity.ToTable("admin_users");
            entity.HasKey(admin => admin.Id);
            entity.Property(admin => admin.Id).HasColumnName("id");
            entity.Property(admin => admin.SupabaseUserId).HasColumnName("supabase_user_id");
            entity.Property(admin => admin.Email).HasColumnName("email").HasMaxLength(320);
            entity.Property(admin => admin.Role)
                .HasColumnName("role").HasMaxLength(40).IsRequired();
            entity.Property(admin => admin.IsActive).HasColumnName("is_active");
            entity.HasIndex(admin => admin.SupabaseUserId).IsUnique();
            entity.Property(admin => admin.CreatedAt)
                .HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<CustomerOrder>(entity =>
        {
            entity.ToTable("customer_orders");
            entity.HasKey(order => order.Id);
            entity.Property(order => order.Id).HasColumnName("id");
            entity.Property(order => order.IdempotencyKey).HasColumnName("idempotency_key");
            entity.HasIndex(order => order.IdempotencyKey).IsUnique();
            entity.Property(order => order.Status).HasColumnName("status")
                .HasMaxLength(20).IsRequired();
            entity.Property(order => order.EstimatedTotalUsd)
                .HasColumnName("estimated_total_usd").HasPrecision(12, 2);
            entity.Property(order => order.OriginalEstimatedTotalUsd)
                .HasColumnName("original_estimated_total_usd").HasPrecision(12, 2);
            entity.Property(order => order.CreatedAt)
                .HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(order => order.ClosedAt).HasColumnName("closed_at");
            entity.Property(order => order.ClosedByAdminUserId)
                .HasColumnName("closed_by_admin_user_id");
            entity.Property(order => order.CancellationReason)
                .HasColumnName("cancellation_reason").HasMaxLength(40);
            entity.Property(order => order.CancellationNote)
                .HasColumnName("cancellation_note").HasMaxLength(500);
            entity.HasIndex(order => new { order.Status, order.CreatedAt, order.Id });
            entity.HasIndex(order => new { order.CreatedAt, order.Id });
            entity.HasIndex(order => order.ClosedAt);
            entity.HasOne(order => order.ClosedByAdminUser)
                .WithMany(admin => admin.ClosedOrders)
                .HasForeignKey(order => order.ClosedByAdminUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<CustomerOrderLine>(entity =>
        {
            entity.ToTable("customer_order_lines");
            entity.HasKey(line => line.Id);
            entity.Property(line => line.Id).HasColumnName("id");
            entity.Property(line => line.OrderId).HasColumnName("order_id");
            entity.Property(line => line.ProductId).HasColumnName("product_id")
                .HasMaxLength(100).IsRequired();
            entity.Property(line => line.ProductName).HasColumnName("product_name")
                .HasMaxLength(240).IsRequired();
            entity.Property(line => line.ProductSlug).HasColumnName("product_slug")
                .HasMaxLength(180).IsRequired();
            entity.Property(line => line.CategoryName).HasColumnName("category_name")
                .HasMaxLength(100).IsRequired();
            entity.Property(line => line.Quantity).HasColumnName("quantity");
            entity.Property(line => line.OriginalQuantity).HasColumnName("original_quantity");
            entity.Property(line => line.UnitPriceUsd).HasColumnName("unit_price_usd")
                .HasPrecision(12, 2);
            entity.Property(line => line.RemovedAt).HasColumnName("removed_at");
            entity.Property(line => line.RemovedByAdminUserId)
                .HasColumnName("removed_by_admin_user_id");
            entity.HasIndex(line => line.OrderId);
            entity.HasIndex(line => new { line.OrderId, line.RemovedAt });
            entity.HasOne(line => line.Order)
                .WithMany(order => order.Lines)
                .HasForeignKey(line => line.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(line => line.RemovedByAdminUser)
                .WithMany(admin => admin.RemovedOrderLines)
                .HasForeignKey(line => line.RemovedByAdminUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<AdminAuditLog>(entity =>
        {
            entity.ToTable("admin_audit_log");
            entity.HasKey(log => log.Id);
            entity.Property(log => log.Id).HasColumnName("id");
            entity.Property(log => log.AdminUserId).HasColumnName("admin_user_id");
            entity.Property(log => log.EntityType).HasColumnName("entity_type")
                .HasMaxLength(40).IsRequired();
            entity.Property(log => log.EntityId).HasColumnName("entity_id")
                .HasMaxLength(100).IsRequired();
            entity.Property(log => log.Action).HasColumnName("action")
                .HasMaxLength(20).IsRequired();
            entity.Property(log => log.Changes).HasColumnName("changes")
                .HasColumnType("jsonb").IsRequired();
            entity.Property(log => log.CreatedAt)
                .HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(log => new { log.EntityType, log.EntityId, log.CreatedAt });
            entity.HasIndex(log => log.CreatedAt);
            entity.HasOne(log => log.AdminUser)
                .WithMany(admin => admin.AuditLogs)
                .HasForeignKey(log => log.AdminUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<CustomerOrderStatusHistory>(entity =>
        {
            entity.ToTable("customer_order_status_history");
            entity.HasKey(history => history.Id);
            entity.Property(history => history.Id).HasColumnName("id");
            entity.Property(history => history.OrderId).HasColumnName("order_id");
            entity.Property(history => history.PreviousStatus).HasColumnName("previous_status")
                .HasMaxLength(20);
            entity.Property(history => history.Status).HasColumnName("status")
                .HasMaxLength(20).IsRequired();
            entity.Property(history => history.ChangedByAdminUserId)
                .HasColumnName("changed_by_admin_user_id");
            entity.Property(history => history.ChangedAt)
                .HasColumnName("changed_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(history => new { history.OrderId, history.ChangedAt });
            entity.HasOne(history => history.Order)
                .WithMany(order => order.StatusHistory)
                .HasForeignKey(history => history.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    public override Task<int> SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.Entity is Category or Product)
            {
                if (entry.State == EntityState.Added)
                {
                    entry.Property("CreatedAt").CurrentValue = now;
                }

                if (entry.State is EntityState.Added or EntityState.Modified)
                {
                    entry.Property("UpdatedAt").CurrentValue = now;
                }
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
