import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Извлекает плоский список названий ингредиентов из JSON рецепта
// (поддержка старого формата [{name,amount}] и разделов [{title,items:[...]}]).
function extractNames(ingredients: any): string[] {
  const raw = Array.isArray(ingredients) ? ingredients : [];
  const groups =
    raw.length && raw[0] && Array.isArray(raw[0].items) ? raw : [{ title: '', items: raw }];
  const names: string[] = [];
  groups.forEach((g: any) =>
    (g.items || []).forEach((it: any) => {
      if (it && it.name) {
        const n = String(it.name).trim().toLowerCase();
        if (n) names.push(n);
      }
    }),
  );
  return names;
}

@Injectable()
export class AdminIngredientsService {
  constructor(private prisma: PrismaService) {}

  // Сводка: группы с их псевдонимами + нераспределённые названия из рецептов
  async getOverview() {
    const [recipes, groups] = await Promise.all([
      this.prisma.recipe.findMany({ select: { ingredients: true } }),
      this.prisma.ingredientGroup.findMany({
        include: { aliases: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const allNames = new Set<string>();
    recipes.forEach((r) => extractNames(r.ingredients).forEach((n) => allNames.add(n)));

    const assigned = new Set(groups.flatMap((g) => g.aliases.map((a) => a.alias)));
    const unassigned = [...allNames]
      .filter((n) => !assigned.has(n))
      .sort((a, b) => a.localeCompare(b, 'ru'));

    return {
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        aliases: g.aliases.map((a) => a.alias).sort((a, b) => a.localeCompare(b, 'ru')),
      })),
      unassigned,
    };
  }

  async createGroup(name: string) {
    const clean = (name || '').trim();
    if (!clean) throw new BadRequestException('Название группы пустое');
    const exists = await this.prisma.ingredientGroup.findUnique({ where: { name: clean } });
    if (exists) throw new ConflictException('Такая группа уже есть');
    await this.prisma.ingredientGroup.create({ data: { name: clean } });
    return this.getOverview();
  }

  async renameGroup(id: string, name: string) {
    const clean = (name || '').trim();
    if (!clean) throw new BadRequestException('Название группы пустое');
    await this.prisma.ingredientGroup.update({ where: { id }, data: { name: clean } });
    return this.getOverview();
  }

  async deleteGroup(id: string) {
    await this.prisma.ingredientGroup.delete({ where: { id } });
    return this.getOverview();
  }

  // Привязать названия к группе (перемещает, если уже были в другой)
  async assign(groupId: string, aliases: string[]) {
    for (const raw of aliases || []) {
      const alias = String(raw || '').trim().toLowerCase();
      if (!alias) continue;
      await this.prisma.ingredientAlias.upsert({
        where: { alias },
        update: { groupId },
        create: { alias, groupId },
      });
    }
    return this.getOverview();
  }

  // Убрать названия из групп (вернуть в нераспределённые)
  async unassign(aliases: string[]) {
    const keys = (aliases || []).map((a) => String(a || '').trim().toLowerCase()).filter(Boolean);
    if (keys.length) {
      await this.prisma.ingredientAlias.deleteMany({ where: { alias: { in: keys } } });
    }
    return this.getOverview();
  }

  // Словарь для приложения: { "сырое название": "Общее название" }
  async getAliasMap() {
    const groups = await this.prisma.ingredientGroup.findMany({ include: { aliases: true } });
    const map: Record<string, string> = {};
    groups.forEach((g) => g.aliases.forEach((a) => (map[a.alias] = g.name)));
    return map;
  }
}
