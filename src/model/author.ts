export class Author {
  constructor(public id: string, public name: string) {}

  static fromData(row: any[]): Author {
    return new Author(row[0], row[1]);
  }
}
