export const DELIVERY_FEE_CENTS = 350;
export const FREE_DELIVERY_THRESHOLD_CENTS = 3500;

export const menu = [
  {
    id: 'margherita',
    name: 'Margherita',
    description: 'San Marzano tomatoes, fresh mozzarella, basil, and extra virgin olive oil.',
    priceCents: 1200,
    category: 'classic',
    vegetarian: true,
    spicy: false,
    image: '/images/margherita.svg',
    badge: 'The original',
  },
  {
    id: 'pepperoni',
    name: 'Pepperoni',
    description: 'Crispy pepperoni, mozzarella, and our signature tomato sauce.',
    priceCents: 1500,
    category: 'classic',
    vegetarian: false,
    spicy: false,
    image: '/images/pepperoni.svg',
    badge: 'Fan favorite',
  },
  {
    id: 'truffle',
    name: 'Truffle Mushroom',
    description: 'Roasted mushrooms, creamy mozzarella, truffle oil, and fresh thyme.',
    priceCents: 1700,
    category: 'signature',
    vegetarian: true,
    spicy: false,
    image: '/images/truffle.svg',
  },
  {
    id: 'hot-honey',
    name: 'Hot Honey',
    description: 'Spicy salami, mozzarella, chili, and a drizzle of golden hot honey.',
    priceCents: 1600,
    category: 'signature',
    vegetarian: false,
    spicy: true,
    image: '/images/hot-honey.svg',
    badge: 'Sweet heat',
  },
  {
    id: 'garden',
    name: 'Garden Party',
    description: 'Roasted peppers, zucchini, red onion, mozzarella, and fresh basil.',
    priceCents: 1400,
    category: 'vegetarian',
    vegetarian: true,
    spicy: false,
    image: '/images/garden.svg',
  },
  {
    id: 'burrata',
    name: 'Burrata Bliss',
    description: 'Creamy burrata, cherry tomatoes, arugula, and balsamic glaze.',
    priceCents: 1800,
    category: 'vegetarian',
    vegetarian: true,
    spicy: false,
    image: '/images/burrata.svg',
    badge: 'Chef’s pick',
  },
];

export const menuById = new Map(menu.map((item) => [item.id, item]));

export function publicMenu() {
  return menu.map(({ priceCents, ...item }) => ({ ...item, price: priceCents / 100 }));
}
