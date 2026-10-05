using Microsoft.EntityFrameworkCore;
using Powergy.Api.Models;

namespace Powergy.Api.Data;

public sealed class PowergyDbContext(DbContextOptions<PowergyDbContext> options)
    : DbContext(options)
{
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();

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
            entity.HasIndex(product => new { product.IsActive, product.TopRank });
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
