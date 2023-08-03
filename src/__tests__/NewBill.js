/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom/extend-expect";
import { screen, fireEvent, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES } from "../constants/routes";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";

jest.mock("../app/store", () => mockStore);

const onNavigate = (pathname) => {
  document.body.innerHTML = ROUTES({ pathname });
};

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    beforeEach(() => {
      // ----- Connecté en tant qu'employé ----- //
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "employee@tld.com",
          password: "employee",
          status: "connected",
        })
      );

      // ----- Le formulaire New Bill est affiché ----- //
      document.body.innerHTML = NewBillUI();
    });

    test("Then it should render the NewBill Page", () => {
      // Le message affiché correspond au rendu attendu?
      const ndf = screen.getByText("Envoyer une note de frais");
      expect(ndf).toBeVisible();
      // L'élément DOM form New Bill, est visible à l'écran?
      const formNewBill = screen.getByTestId("form-new-bill");
      expect(formNewBill).toBeVisible();
    });
  });
});

// ***************
describe("When I click on the send button", () => {
  describe("When at least one required field is not correctly completed", () => {
    test("Then the user should stay on New Bill Page", async () => {
      //  récupère la fonction handleSubmit avec jest
      const handleSubmit = jest.fn((e) => e);
      // screen.getByTestId = document.getElementById ?
      const form = screen.getByTestId("form-new-bill");
      // Mettre un eventListener sur le submit du form
      form.addEventListener("submit", handleSubmit);

      // ----- Le formulaire est incomplet, les champs requis sont vides.----- //
      screen.getByTestId("expense-type").value = "";
      screen.getByTestId("expense-name").value = "";
      screen.getByTestId("datepicker").value = "";
      expect(screen.getByTestId("datepicker")).toBeDefined();
      screen.getByTestId("amount").value = "";
      expect(screen.getByTestId("amount")).toBeDefined();
      screen.getByTestId("vat").value = "";
      screen.getByTestId("pct").value = "";
      expect(screen.getByTestId("pct")).toBeDefined();
      screen.getByTestId("commentary").value = "";

      // Simulation d'un submit avec jest
      fireEvent.submit(form);

      // La fonction handleSubmit a été appelée?
      expect(handleSubmit).toHaveBeenCalled();
      // L'utilisateur est toujours sur la page New Bills?
      expect(form).toBeVisible();
      expect(screen.getByText("Envoyer une note de frais")).toBeVisible();
    });
  });

  describe("When every fields are correctly completed", () => {
    test("Then it should redirect to Bills Page", async () => {
      // ----- Bill de test ----- //
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      // ----- Faux fichier ----- //
      const fakeFile = new File(["hello"], "hello.png", {
        type: "image/png",
      });

      // ----- Le formulaire est complet ----- //
      screen.getByTestId("expense-type").value = "Fournitures de bureau";
      screen.getByTestId("expense-name").value =
        "Casque anti-bruit pour les collègues bruyants";
      screen.getByTestId("datepicker").value = "2022-02-22";
      screen.getByTestId("amount").value = "42";
      screen.getByTestId("vat").value = "70";
      screen.getByTestId("pct").value = "25";
      screen.getByTestId("commentary").value =
        "Je n'ai rien de personnel contre Jean-Luc mais c'est vrai qu'il a des goûts musicaux très particuliers.";
      userEvent.upload(screen.getByTestId("file"), fakeFile);

      // ----- Reproduction de la fonction handleSubmit ----- //
      const form = screen.getByTestId("form-new-bill");
      const handleSubmitNewBill = jest.fn((e) => newBill.handleSubmit(e));
      form.addEventListener("submit", handleSubmitNewBill);

      // Simulation d'un submit
      fireEvent.submit(form);

      // La fonction handleSubmitNewBill a été appelée?
      expect(handleSubmitNewBill).toHaveBeenCalled();
      // L'utilisateur est bien retourné sur la page Bills ?
      expect(screen.getByTestId("btn-new-bill")).toBeVisible();
      expect(screen.getByText("Mes notes de frais")).toBeVisible();
    });
  });

  // ajouter un test d'intégration POST new bill
  // API POST
  describe("When I post a NewBill", () => {
    test("Then posting the NewBill from mock API POST", async () => {
      // ----- Observation de la méthode bills du mockStore ----- //
      jest.spyOn(mockStore, "bills");

      // ----- On récupère la liste des bills présentent dans le mockStore ----- //
      const billsList = await mockStore.bills().list();
      // Il y a bien 4 bills, par défault, dans le mockStore?
      expect(billsList.length).toBe(4);

      // ----- Envoie une nouvelle bill dans le mockStore ----- //
      let bill = {
        email: "employee@tld.com",
        type: "Hôtel et logement",
        name: "mocked bill des enfers",
        amount: "400",
        date: "2004-04-04",
        vat: "80",
        pct: "20",
        commentary: "mocked bill for POST test",
        fileUrl: "https://localhost:3456/images/test.jpg",
        fileName: "test.jpg",
        status: "pending",
      };

      mockStore.bills().create(bill);

      // Le nombre de bills dans le store a t'il été incrémenté suite à notre update?
      waitFor(() => expect(billsList.length).toBe(5));
    });
  });
});
